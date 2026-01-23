from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("matches", "0005_rating_memories_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="match",
            name="watchability_score",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="match",
            name="watchability_confidence",
            field=models.CharField(blank=True, max_length=12, null=True),
        ),
        migrations.AddField(
            model_name="match",
            name="watchability_updated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
